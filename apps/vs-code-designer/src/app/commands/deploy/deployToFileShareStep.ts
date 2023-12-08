/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  artifactsDirectory,
  connectionsFileName,
  DirectoryKind,
  hostFileName,
  libDirectory,
  mapsDirectory,
  parametersFileName,
  schemasDirectory,
  WEBSITE_CONTENTAZUREFILECONNECTIONSTRING,
  WebsiteContentShare,
  workflowFileName,
  wwwrootDirectory,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getArtifactsPathInLocalProject, getWorkflowsPathInLocalProject, type File } from '../../utils/codeless/common';
import { getRandomHexString } from '../../utils/fs';
import { tryGetFunctionProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../workflows/switchDebugMode/switchDebugMode';
import type { StringDictionary } from '@azure/arm-appservice';
import { type ShareClient, ShareServiceClient } from '@azure/storage-file-share';
import type { ShareDirectoryClient } from '@azure/storage-file-share';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { type IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { ProgressLocation, window } from 'vscode';

export const deployToFileShare = async (context: IActionContext, site: ParsedSite) => {
  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    const logicAppClient = await site.createClient(context);
    const appSettings: StringDictionary = await logicAppClient.listApplicationSettings();
    const shareName = appSettings.properties[WebsiteContentShare];
    const connectionString = appSettings.properties[WEBSITE_CONTENTAZUREFILECONNECTIONSTRING] ?? '';

    const message: string = localize('uploadingFileShare', 'Uploading files to File Share "{0}"...', shareName);
    ext.outputChannel.appendLog(message);
    progress.report({ message });

    const storageShareClient = await createStorageShareClient(connectionString);
    const shareClient = storageShareClient.getShareClient(shareName);

    if (await shareClient.exists()) {
      const workspaceFolder = await getWorkspaceFolderPath(context);
      const projectPath: string | undefined = await tryGetFunctionProjectRoot(context, workspaceFolder, true /* suppressPrompt */);

      const directoryClient = shareClient.getDirectoryClient(wwwrootDirectory);
      if (await directoryClient.exists()) {
        const tempUploadDirectory = `wwwroot-temp--${getRandomHexString(4)}`;
        await uploadProjectFiles(shareClient, projectPath, tempUploadDirectory);
        const newRootDirectoryClient = await shareClient.getDirectoryClient(tempUploadDirectory);
        await deleteFilesAndSubdirectories(directoryClient);
        await directoryClient.delete();
        await newRootDirectoryClient.rename(wwwrootDirectory);
      } else {
        await uploadProjectFiles(shareClient, projectPath, wwwrootDirectory);
      }
    }
  });
};

const createStorageShareClient = async (connectionString: string): Promise<ShareServiceClient> => {
  return ShareServiceClient.fromConnectionString(connectionString);
};

const createDirectories = async (shareClient: ShareClient, directories: string[]) => {
  for (const directory of directories) {
    const directoryClient = shareClient.getDirectoryClient(directory);
    await directoryClient.createIfNotExists();
  }
};

const uploadFiles = async (shareClient: ShareClient, files: File[], directoryPath: string) => {
  for (const file of files) {
    const directoryClient = shareClient.getDirectoryClient(directoryPath);
    const fileClient = directoryClient.getFileClient(file.name);
    await fileClient.uploadFile(file.path);
  }
};

const uploadRootFiles = async (shareClient: ShareClient, projectPath: string | undefined, rootDirectory: string) => {
  const hostJsonPath: string = path.join(projectPath, hostFileName);
  const parametersJsonPath: string = path.join(projectPath, parametersFileName);
  const connectionsJsonPath: string = path.join(projectPath, connectionsFileName);
  const rootFiles = [
    { path: hostJsonPath, name: hostFileName },
    { path: parametersJsonPath, name: parametersFileName },
    { path: connectionsJsonPath, name: connectionsFileName },
  ];
  for (const rootFile of rootFiles) {
    if (await fse.pathExists(rootFile.path)) {
      await uploadFiles(shareClient, [{ path: rootFile.path, name: rootFile.name }], rootDirectory);
    }
  }
};

const uploadWorkflowsFiles = async (shareClient: ShareClient, projectPath: string | undefined, rootDirectory: string) => {
  const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
  for (const workflowFile of workflowFiles) {
    const directoryPath = path.join(rootDirectory, workflowFile.name);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, [{ ...workflowFile, name: workflowFileName }], directoryPath);
  }
};

const uploadeArtifactsFiles = async (shareClient: ShareClient, projectPath: string | undefined, rootDirectory: string) => {
  const artifactsFiles = await getArtifactsPathInLocalProject(projectPath);
  const artifactsPathShare = path.join(rootDirectory, artifactsDirectory);
  await createDirectories(shareClient, [artifactsPathShare]);

  if (artifactsFiles.maps.length > 0) {
    const directoryPath = path.join(rootDirectory, artifactsDirectory, mapsDirectory);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, artifactsFiles.maps, directoryPath);
  }

  if (artifactsFiles.schemas.length > 0) {
    const directoryPath = path.join(rootDirectory, artifactsDirectory, schemasDirectory);
    await createDirectories(shareClient, [directoryPath]);
    await uploadFiles(shareClient, artifactsFiles.schemas, directoryPath);
  }
};

const uploadLibFolderFiles = async (shareclient: ShareClient, projectPath: string, rootDirectory: string) => {
  const libFolderPath = path.join(projectPath, libDirectory);
  const remoteFolderPath = path.join(rootDirectory, libDirectory);

  if (await fse.pathExists(libFolderPath)) {
    await uploadFilesRecursively(libFolderPath, remoteFolderPath, shareclient);
  }
};

const uploadFilesRecursively = async (folderPath: string, remotePath: string, shareClient: ShareClient) => {
  const files: string[] = await fse.readdir(folderPath);
  const directoryClient = shareClient.getDirectoryClient(remotePath);
  await directoryClient.createIfNotExists();
  const filesToUpload: File[] = [];

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const fileStats = await fse.lstat(fullPath);
    if (fileStats.isFile()) {
      filesToUpload.push({ name: file, path: fullPath });
    }

    if (fileStats.isDirectory()) {
      const subfolderPath = path.join(folderPath, file);
      await uploadFilesRecursively(subfolderPath, path.join(remotePath, file), shareClient);
    }
  }

  await uploadFiles(shareClient, filesToUpload, remotePath);
};

const deleteFilesAndSubdirectories = async (directoryClient: ShareDirectoryClient) => {
  try {
    const filesAndDirectories = directoryClient.listFilesAndDirectories();
    for await (const fileOrDirectory of filesAndDirectories) {
      if (fileOrDirectory.kind === DirectoryKind.directory) {
        const subDirectoryClient = directoryClient.getDirectoryClient(fileOrDirectory.name);
        await subDirectoryClient.forceCloseAllHandles();
        await deleteFilesAndSubdirectories(subDirectoryClient);
        await subDirectoryClient.delete();
      } else if (fileOrDirectory.kind === DirectoryKind.file) {
        const fileClient = directoryClient.getFileClient(fileOrDirectory.name);
        await fileClient.forceCloseAllHandles();
        await fileClient.delete();
      }
    }
  } catch (error) {
    console.error(`Error deleting files and subdirectories from file share: ${error.message}`);
  }
};

const uploadProjectFiles = async (shareClient: ShareClient, localProjectPath: string, remoteFolderName: string) => {
  await shareClient.createDirectory(remoteFolderName);

  await uploadRootFiles(shareClient, localProjectPath, remoteFolderName);
  await uploadWorkflowsFiles(shareClient, localProjectPath, remoteFolderName);
  await uploadeArtifactsFiles(shareClient, localProjectPath, remoteFolderName);
  await uploadLibFolderFiles(shareClient, localProjectPath, remoteFolderName);
};

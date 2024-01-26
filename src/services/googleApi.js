import { log } from "console";
import { google } from "googleapis";
import stream from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  keyFile: "api_credentials.json",
  scopes: SCOPES,
});

const permissions = {
  role: "reader",
  type: "anyone",
};

// Create the folder before saving the images

const createFolder = async (drive, folderName, parentFolderId = null) => {
  try {
    // Check if the folder exists; if not, create it with public permissions
    const folderQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const folders = await drive.files.list({ q: folderQuery });

    if (folders.data.files.length === 0) {
      const response = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: parentFolderId ? [parentFolderId] : [],
        },
        fields: "*",
      });

      // Share the folder publicly (make it accessible to anyone with the link)
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: "reader",
          type: "user",
          emailAddress: process.env.DRIVE_SHARED_USER_MAIL,
        },
      });

      return response.data.id;
    } else {
      return folders.data.files[0].id;
    }
  } catch (error) {
    console.error(`Error creating folder ${folderName}:`, error.message);
    throw error;
  }
};

const handleDeleteFolders = async (drive, folderName) => {
  // Check if the folder exists; if not, create it
  const folderQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const folders = await drive.files.list({ q: folderQuery });

  const folderList = folders.data.files;

  // Delete existing files with the same name
  for (const existingFile of folderList) {
    try {
      await drive.files.delete({
        fileId: existingFile.id,
      });

      console.log(
        `Deleted existing file ${existingFile.name}. ID: ${existingFile.id}`
      );
    } catch (error) {
      console.error(
        `Error deleting existing file ${existingFile.name}:`,
        error.message
      );
      throw error;
    }
  }
};

const generatePublicUrl = async (drive, fileId) => {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const result = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink, webContentLink",
    });

    //console.log(result.data);

    return result.data;
  } catch (error) {
    console.error(`Error Generating Url :`, error.message);
    throw error;
  }
};

export const deleteDriveFileAdmin = async (id) => {
  const drive = google.drive({ version: "v3", auth });

  await drive.files.delete({
    fileId: id,
  });

  return;
};

// Handle upload images to the google drive

export const uploadImagesToDrive = async (
  fileList,
  customerName,
  acSerialNumber,
  workId
) => {
  const drive = google.drive({ version: "v3", auth });

  // await handleDeleteFolders(drive, "ERE-SM-UPLOADS");
  // await handleDeleteFolders(drive, customerName);
  // await handleDeleteFolders(drive, acSerialNumber);
  // await handleDeleteFolders(drive, workId);

  // Create the base folder if it doesn't exist
  const baseFolderId = await createFolder(
    drive,
    process.env.DRIVE_PARENT_FOLDER
  );

  // Create the customer folder if it doesn't exist
  const customerFolderId = await createFolder(
    drive,
    customerName,
    baseFolderId
  );

  // Create the AC unit folder if it doesn't exist
  const acUnitFolderId = await createFolder(
    drive,
    acSerialNumber,
    customerFolderId
  );

  // Create the work folder if it doesn't exist
  const workFolderId = await createFolder(drive, workId, acUnitFolderId);

  const uploads = [];

  for (const fileObject of fileList) {
    const requestBody = {
      name: fileObject.originalname,
      mimeType: fileObject.mimeType,
      parents: [workFolderId],
    };

    const media = {
      body: stream.Readable.from([fileObject.buffer]),
    };

    try {
      const response = await drive.files.create({
        requestBody: requestBody,
        media: media,
      });

      console.log(response);

      const publicLink = await generatePublicUrl(drive, response.data.id);

      uploads.push({
        id: response.data.id,
        fileName: response.data.name,
        mimeType: response.data.mimeType,
        publicUrl: publicLink.webViewLink,
        contentUrl: publicLink.webContentLink,
      });
    } catch (error) {
      console.error(
        `Error uploading file ${fileObject.originalname}:`,
        error.message
      );
      throw error;
    }
  }

  return uploads;
};

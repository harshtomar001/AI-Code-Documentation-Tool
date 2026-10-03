import api from "./client";

/**
 * Upload all files belonging to a local project.
 *
 * The browser gives us File objects from:
 * <input type="file" webkitdirectory />
 *
 * We preserve webkitRelativePath so the backend can reconstruct
 * the original repository structure.
 */
export async function saveProjectFiles(projectId, files) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  console.log("inside SAVE PROJECT FILES");

  if (!files || files.length === 0) {
    return {
      project_id: projectId,
      files_uploaded: 0,
    };
  }

  const formData = new FormData();

  for (const file of files) {
    const relativePath =
      file.webkitRelativePath || file.name;

    formData.append(
      "files",
      file,
      relativePath
    );
  }

  console.log("inside SAVE PROJECT FILES  after formData()");

  try {
      console.log("before the post api of the files")

      const response = await api.post(
        `/api/projects/${encodeURIComponent(projectId)}/files`,
        formData
      );
      console.log("after the post  api of the files");
      console.log("SAVE PROJECT FILES RESPONSE:", response.data);

      return response.data;
  } catch (error) {
      console.error(
        "SAVE PROJECT FILES ERROR:",
        error.response?.status,
        error.response?.data
      );

      throw error;
    }




}

export async function getProjectFiles(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  console.log("inside the GET PROJECT FILES()");

  try {
      console.log("inside the getprojectFiles() before the api call");

      const response = await api.get(
       `/api/projects/${encodeURIComponent(projectId)}/files`
      );

       console.log(
    "GET PROJECT FILES RESPONSE:",
    response.data
  );
      console.log("inside the getProjectFiles() after the api call");
      return response.data.files || [];

  }
  catch (error) {

      console.error(
        "SAVE PROJECT FILES ERROR:",
        error.response?.status,
        error.response?.data
      );

      throw error;

  }


}

export async function getProjectFileContent(projectId, path) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  if (!path) {
    throw new Error("File path is required.");
  }

  const response = await api.get(
    `/api/projects/${encodeURIComponent(projectId)}/files/content`,
    {
      params: {
        path,
      },
      responseType: "text",
    }
  );

  return response.data;
}

export async function getProject(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  console.log("inside the GET PROJECT() ");

  console.log("inside the GET PROJECT()  before the api calling");

  const response = await api.get(
    `/api/projects/${encodeURIComponent(projectId)}`
  );

  console.log("inside the GET PROJECT() after the api calling");

  return response.data;
}
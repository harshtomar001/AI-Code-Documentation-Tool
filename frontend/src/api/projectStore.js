const PROJECTS_KEY = "docuai_projects_v1";
const DB_NAME = "docuai_local_projects_v1";
const STORE_NAME = "files";

export function getSavedProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const projects = raw ? JSON.parse(raw) : [];
    return Array.isArray(projects) ? projects : [];
  } catch (error) {
    console.error("Could not load saved projects:", error);
    return [];
  }
}

export function saveProject(project) {
  const projects = getSavedProjects();

  const existingIndex = projects.findIndex(
    (item) => item.id === project.id
  );

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.unshift(project);
  }

  localStorage.setItem(
    PROJECTS_KEY,
    JSON.stringify(projects.slice(0, 50))
  );

  return project;
}

export function removeProject(projectId) {
  const projects = getSavedProjects().filter(
    (item) => item.id !== projectId
  );

  localStorage.setItem(
    PROJECTS_KEY,
    JSON.stringify(projects)
  );
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectFiles(projectId, files) {
  const db = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    for (const [index, file] of files.entries()) {
      const path =
        file.webkitRelativePath || file.name;

      store.put({
        id: `${projectId}:${index}`,
        projectId,
        path,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        lastModified: file.lastModified || Date.now(),
        blob: file,
      });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("Transaction aborted"));
  });

  db.close();
}

export async function getProjectFiles(projectId) {
  const db = await openDatabase();

  const records = await new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const request = transaction
      .objectStore(STORE_NAME)
      .getAll();

    request.onsuccess = () => {
      resolve(
        request.result.filter(
          (item) => item.projectId === projectId
        )
      );
    };

    request.onerror = () => reject(request.error);
  });

  db.close();

  return records.map((record) => {
    const file = new File(
      [record.blob],
      record.name,
      {
        type: record.type,
        lastModified: record.lastModified,
      }
    );

    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      value: record.path,
    });

    return file;
  });
}

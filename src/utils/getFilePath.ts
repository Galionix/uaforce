export const getFilePath = (filePath: string) => {
  const parts = filePath.split("/");
  parts.pop(); // Убираем имя файла

  return parts.join("/");
};

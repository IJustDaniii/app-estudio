export function appendMaterialFiles(formData: FormData, files: File[]) {
  formData.delete("files");
  for (const file of files) formData.append("files", file);
}

export function resetMaterialUploadForm(form: { reset: () => void }) {
  form.reset();
}

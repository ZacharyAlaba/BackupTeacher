export async function getSchoolLogoDataUrl(): Promise<string> {
  const response = await fetch("/images/logo.jpg");
  if (!response.ok) {
    throw new Error(`Could not load school logo: ${response.status}`);
  }

  const logo = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read school logo image."));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read school logo image."));
    reader.readAsDataURL(logo);
  });
}

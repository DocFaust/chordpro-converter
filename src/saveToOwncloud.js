import axios from "axios";

// URL und Token anpassen
const token = "IYQFP-ULETE-BEVGC-CPCKV";

export const saveFile = async (path, content) => {
    const serverUrl = `https://owncloud.docfaust.de/remote.php/dav/files/wfaust/${path}`;
    try {
        const response = await axios.put(serverUrl, content, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "text/plain", // Passe den Typ der Datei an
            },
        });

        if (response.status === 201) {
            console.log("Uploaded")
        } else {
            console.error("Upload failed");
        }
    } catch (error) {
        console.error(error);
    }
}
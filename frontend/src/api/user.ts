// api/user.ts
import api from "./axios";

export const updateESignature = async (file: File) => {
    const formData = new FormData();
    formData.append("e_signature", file);

    const response = await api.patch("/users/update-e-signature/", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};
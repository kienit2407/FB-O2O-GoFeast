/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export const merchantService = {
    updateMe: (payload: any) => API.patch('/merchants/me', payload),

    uploadLogo: (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return API.post('/merchants/me/logo', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadCover: (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return API.post('/merchants/me/cover', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

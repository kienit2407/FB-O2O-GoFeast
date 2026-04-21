/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useMerchantOnboarding.ts
import { useEffect, useMemo, useState } from 'react';
import { merchantAuthService } from '@/service/merchant.auth.service';
import { useMerchantAuth } from '@/store/authStore';

const KEY = 'merchant_registration';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function useMerchantOnboarding() {
    const { accessToken, onboarding, register, fetchOnboarding } = useMerchantAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // restore từ server nếu đã login
    useEffect(() => {
        if (!accessToken) return;
        fetchOnboarding().then((ob) => {
            const map: Record<string, number> = {
                basic_info: 2,
                documents: 3,
                ready_to_submit: 4,
                waiting_approval: 4,
                approved: 4,
            };
            setCurrentStep(map[ob.current_step] ?? 2);
            if (ob.documents) {
                setUploadedFiles({
                    id_card_front: ob.documents.id_card_front_url || '',
                    id_card_back: ob.documents.id_card_back_url || '',
                    business_license: ob.documents.business_license_url || '',
                    store_front: ob.documents.store_front_image_url || '',
                });
            }
        });
    }, [accessToken]);

    const allDocsSelected = useMemo(() => (
        !!selectedFiles.id_card_front &&
        !!selectedFiles.id_card_back &&
        !!selectedFiles.business_license &&
        !!selectedFiles.store_front
    ), [selectedFiles]);

    const hasAllDocsUploaded = useMemo(() => (
        !!uploadedFiles.id_card_front &&
        !!uploadedFiles.id_card_back &&
        !!uploadedFiles.business_license &&
        !!uploadedFiles.store_front
    ), [uploadedFiles]);

    const doRegister = async (payload: any) => {
        setIsLoading(true);
        try {
            await register(payload); // auto-login
            setCurrentStep(2);
        } finally {
            setIsLoading(false);
        }
    };

    const saveBasicInfo = async (payload: any) => {
        setIsLoading(true);
        try {
            await merchantAuthService.saveBasicInfo(payload);
            setCurrentStep(3);
        } finally {
            setIsLoading(false);
        }
    };

    const uploadAllDocs = async () => {
        setIsLoading(true);
        try {
            const order = [
                { type: 'id_card_front', file: selectedFiles.id_card_front },
                { type: 'id_card_back', file: selectedFiles.id_card_back },
                { type: 'business_license', file: selectedFiles.business_license },
                { type: 'store_front', file: selectedFiles.store_front },
            ];

            const temp: any = {};
            for (const it of order) {
                const form = new FormData();
                form.append('file', it.file!);
                form.append('documentType', it.type);
                const res = await merchantAuthService.uploadDocument(form);
                const docs = res.data?.data?.documents;
                // map về state hiển thị
                temp[it.type] =
                    docs?.[`${it.type}_url`] ||
                    docs?.[
                    it.type === 'store_front' ? 'store_front_image_url' :
                        it.type === 'business_license' ? 'business_license_url' :
                            `${it.type}_url`
                    ] ||
                    '';
            }

            setUploadedFiles((p) => ({ ...p, ...temp }));
            setSelectedFiles({});
            setCurrentStep(4);
        } finally {
            setIsLoading(false);
        }
    };

    const submit = async () => {
        setIsLoading(true);
        try {
            await merchantAuthService.submit();
            await fetchOnboarding();
        } finally {
            setIsLoading(false);
        }
    };

    return {
        currentStep, setCurrentStep,
        selectedFiles, setSelectedFiles,
        uploadedFiles, setUploadedFiles,
        allDocsSelected, hasAllDocsUploaded,
        isLoading,

        doRegister,
        saveBasicInfo,
        uploadAllDocs,
        submit,
    };
}

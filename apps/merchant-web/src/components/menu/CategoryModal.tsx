/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types";

type Mode = "create" | "edit";

type FormState = {
    name: string;
    description: string;
};

type Props = {
    open: boolean;
    mode: Mode;
    initialData?: Category | null; // truyền category khi edit
    onClose: () => void;
    onSubmit: (values: FormState) => Promise<void> | void;
};

export default function CategoryModal({
    open,
    mode,
    initialData,
    onClose,
    onSubmit,
}: Props) {
    const isEdit = mode === "edit";

    const defaultValues = useMemo<FormState>(
        () => ({
            name: initialData?.name ?? "",
            description: initialData?.description ?? "",
        }),
        [initialData]
    );

    const [formData, setFormData] = useState<FormState>(defaultValues);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setFormData(defaultValues);
    }, [open, defaultValues]);

    const canSubmit = formData.name.trim().length > 0;

    const handleSubmit = async () => {
        if (!canSubmit || saving) return;
        setSaving(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                description: formData.description.trim(),
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}</DialogTitle>
                    {!isEdit ? (
                        <DialogDescription>Tạo danh mục để phân loại sản phẩm</DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tên danh mục</Label>
                        <Input
                            placeholder="VD: Cà phê, Trà, Bánh ngọt..."
                            value={formData.name}
                            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Mô tả (tuỳ chọn)</Label>
                        <Textarea
                            placeholder="Mô tả ngắn về danh mục..."
                            value={formData.description}
                            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                        {isEdit ? "Lưu thay đổi" : "Tạo danh mục"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
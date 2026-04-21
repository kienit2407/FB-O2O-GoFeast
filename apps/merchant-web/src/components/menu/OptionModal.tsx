/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Option } from "@/types";

type Mode = "create" | "edit";

type FormState = {
    name: string;
    priceAdjustment: string; // string cho input mượt
};

type Props = {
    open: boolean;
    mode: Mode;
    initialData?: Option | null; // edit thì truyền option
    onClose: () => void;
    onSubmit: (values: { name: string; priceAdjustment: number }) => Promise<void> | void;
};

export default function OptionModal({
    open,
    mode,
    initialData,
    onClose,
    onSubmit,
}: Props) {
    const isEdit = mode === "edit";

    const defaults = useMemo<FormState>(
        () => ({
            name: initialData?.name ?? "",
            priceAdjustment: initialData ? String(initialData.priceAdjustment ?? 0) : "0",
        }),
        [initialData]
    );

    const [form, setForm] = useState<FormState>(defaults);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setForm(defaults);
    }, [open, defaults]);

    const nameOk = form.name.trim().length > 0;
    const priceNum = Number(form.priceAdjustment);
    const priceOk = Number.isFinite(priceNum);

    const canSubmit = nameOk && priceOk;

    const handleSubmit = async () => {
        if (!canSubmit || saving) return;
        setSaving(true);
        try {
            await onSubmit({
                name: form.name.trim(),
                priceAdjustment: priceNum,
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
                    <DialogTitle>{isEdit ? "Chỉnh sửa tuỳ chọn" : "Thêm tuỳ chọn"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tên tuỳ chọn</Label>
                        <Input
                            placeholder="VD: Size M, 50% đường..."
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Giá cộng thêm (VNĐ)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={form.priceAdjustment}
                            onChange={(e) => setForm((p) => ({ ...p, priceAdjustment: e.target.value }))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                        {isEdit ? "Lưu" : "Thêm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
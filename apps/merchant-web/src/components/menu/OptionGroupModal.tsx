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
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { OptionGroup } from "@/types";

type Mode = "create" | "edit";

type FormState = {
    name: string;
    type: "single" | "multiple";
    required: boolean;
};

type Props = {
    open: boolean;
    mode: Mode;
    initialData?: OptionGroup | null; // edit thì truyền group
    onClose: () => void;
    onSubmit: (values: FormState) => Promise<void> | void;
};

export default function OptionGroupModal({
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
            type: initialData?.type ?? "single",
            required: initialData?.required ?? false,
        }),
        [initialData]
    );

    const [form, setForm] = useState<FormState>(defaults);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setForm(defaults);
    }, [open, defaults]);

    const canSubmit = form.name.trim().length > 0;

    const handleSubmit = async () => {
        if (!canSubmit || saving) return;
        setSaving(true);
        try {
            await onSubmit({
                name: form.name.trim(),
                type: form.type,
                required: form.required,
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
                    <DialogTitle>{isEdit ? "Chỉnh sửa nhóm tuỳ chọn" : "Thêm nhóm tuỳ chọn"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tên nhóm</Label>
                        <Input
                            placeholder="VD: Size, Đường, Đá..."
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Loại chọn</Label>
                        <Select
                            value={form.type}
                            onValueChange={(v: "single" | "multiple") =>
                                setForm((p) => ({ ...p, type: v }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Chọn một</SelectItem>
                                <SelectItem value="multiple">Chọn nhiều</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={form.required}
                            onCheckedChange={(v) => setForm((p) => ({ ...p, required: v }))}
                        />
                        <Label>Bắt buộc chọn</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                        {isEdit ? "Lưu" : "Tạo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
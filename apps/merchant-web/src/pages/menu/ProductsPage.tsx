/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile, UploadProps } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SlidersOutlined,
  StarFilled,
} from "@ant-design/icons";

import { useMenuStore } from "@/store/menuStore";
import type { Product } from "@/types";
import ProductImagesModal from "@/components/menu/ProductImagesModal";
import ProductModal from "@/components/menu/ProductModal";
import ProductOptionsModal from "@/components/menu/ProductOptionsModal";

const { Dragger } = Upload;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

type StatusFilter = "all" | "available" | "unavailable";
type Mode = "create" | "edit";

type ProductFormValues = {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  toppings: string[];
  isAvailable: boolean;
  salePrice?: number;
  replaceImages: boolean;
  isActive: boolean; // ✅ NEW
};

export default function ProductsPage() {
  // ===== store =====
  const products = useMenuStore((s) => s.products);
  const categories = useMenuStore((s) => s.categories);
  const toppings = useMenuStore((s) => s.toppings);

  const fetchProducts = useMenuStore((s) => s.fetchProducts);
  const fetchCategories = useMenuStore((s) => s.fetchCategories);
  const fetchToppings = useMenuStore((s) => s.fetchToppings);

  const createProduct = useMenuStore((s) => s.createProduct);
  const updateProduct = useMenuStore((s) => s.updateProduct);
  const toggleProductAvailable = useMenuStore((s) => s.toggleProductAvailable);
  const deleteProduct = useMenuStore((s) => s.deleteProduct);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
  // ===== UI state =====
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<Product | null>(null);

  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [imagesProductId, setImagesProductId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ProductFormValues>();
  type ActiveTab = "all" | "active" | "inactive";
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const canDelete = activeTab === "inactive"; // ✅ chỉ tab ngừng hoạt động
  const reorderProducts = useMenuStore((s) => s.reorderProducts);
  useEffect(() => {
    fetchCategories({ includeInactive: true }).catch(() => { });
    fetchToppings({ includeInactive: true }).catch(() => { });
    fetchProducts({ status: "all" }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "Không xác định";

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [products]);

  const filtered = useMemo(() => {
    let arr = [...sorted];

    if (q.trim()) {
      const key = q.trim().toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(key));
    }
    if (categoryId !== "all") arr = arr.filter((p) => p.categoryId === categoryId);
    if (status === "available") arr = arr.filter((p) => p.isAvailable);
    if (status === "unavailable") arr = arr.filter((p) => !p.isAvailable);
    if (activeTab === "active") arr = arr.filter((p) => p.isActive);
    if (activeTab === "inactive") arr = arr.filter((p) => !p.isActive);

    return arr;
  }, [sorted, q, categoryId, status, activeTab]);
  const handleMoveUp = async (indexInFiltered: number) => {
    if (indexInFiltered === 0) return;

    const ids = sorted.map((p) => p.id);
    const currentId = filtered[indexInFiltered]?.id;
    const aboveId = filtered[indexInFiltered - 1]?.id;
    if (!currentId || !aboveId) return;

    const i1 = ids.indexOf(currentId);
    const i2 = ids.indexOf(aboveId);
    if (i1 < 0 || i2 < 0) return;

    [ids[i1], ids[i2]] = [ids[i2], ids[i1]];

    try {
      await reorderProducts(ids);
      message.success("Đã cập nhật thứ tự");
    } catch (e: any) {
      message.error(e?.message || "Không cập nhật được thứ tự");
    }
  };
  const tabLabel = (text: string, count: number) => (
    <Badge count={count} showZero size="default" offset={[8, -4]}>
      <span style={{ paddingRight: 5, display: "inline-block" }}>{text}</span>
    </Badge>
  );
  const tabCounts = useMemo(() => {
    const all = sorted.length;
    const active = sorted.filter((p) => p.isActive).length;
    const inactive = all - active;
    return { all, active, inactive };
  }, [sorted]);
  const handleMoveDown = async (indexInFiltered: number) => {
    if (indexInFiltered === filtered.length - 1) return;

    const ids = sorted.map((p) => p.id);
    const currentId = filtered[indexInFiltered]?.id;
    const belowId = filtered[indexInFiltered + 1]?.id;
    if (!currentId || !belowId) return;

    const i1 = ids.indexOf(currentId);
    const i2 = ids.indexOf(belowId);
    if (i1 < 0 || i2 < 0) return;

    [ids[i1], ids[i2]] = [ids[i2], ids[i1]];

    try {
      await reorderProducts(ids);
      message.success("Đã cập nhật thứ tự");
    } catch (e: any) {
      message.error(e?.message || "Không cập nhật được thứ tự");
    }
  };
  const uploadProps: UploadProps = {
    multiple: true,
    maxCount: 5,
    listType: "picture",
    beforeUpload: (file) => {
      const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      if (!okType) {
        message.error("Chỉ cho phép JPG/PNG/WebP");
        return Upload.LIST_IGNORE;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error("Ảnh phải < 5MB");
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: ({ fileList }) => setFileList(fileList),
    fileList,
  };

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (p: Product) => {
    setMode("edit");
    setEditing(p);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setSaving(false);
    setEditing(null);
  };

  const handleSubmitModal = async (payload: { values: ProductFormValues; files: File[] }) => {
    const { values, files } = payload;

    const common = {
      name: values.name,
      description: values.description || "",
      price: Number(values.price) || 0,
      salePrice: Number(values.salePrice) || 0,
      categoryId: values.categoryId,
      toppingIds: values.toppings || [],
    };

    if (mode === "create") {
      await createProduct({
        ...common,
        images: files,
        isAvailable: true,                // ✅ create mặc định còn hàng
        isActive: values.isActive ?? true // ✅ modal chỉnh active
      });
      message.success("Tạo sản phẩm thành công");

    } else {
      if (!editing) return;

      await updateProduct(editing.id, {
        ...common,
        isActive: values.isActive,        // ✅ edit chỉ gửi is_active
        //  KHÔNG gửi isAvailable nữa
      });
      message.success("Cập nhật sản phẩm thành công");
    }

    closeModal();
    // ✅ đừng nuốt lỗi, và nhớ await
    try {
      await fetchProducts({ status: "all" });
    } catch (e: any) {
      console.error("fetchProducts failed:", e);
      message.error(e?.message || "Fetch products failed");
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: "Thứ tự",
      key: "order",
      width: 110,
      render: (_: any, record: Product) => {
        const idx = filtered.findIndex((p) => p.id === record.id);
        return (
          <Space>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => handleMoveUp(idx)}
              disabled={idx <= 0}
            />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMoveDown(idx)}
              disabled={idx < 0 || idx >= filtered.length - 1}
            />
          </Space>
        );
      },
    },
    {
      title: "Ảnh",
      dataIndex: "images",
      key: "images",
      width: 90,
      render: (imgs: string[] | undefined, record) =>
        imgs?.[0] ? (
          <Image
            src={imgs[0]}
            width={60}
            height={60}
            style={{ objectFit: "cover", borderRadius: 8 }}
            preview={{ mask: "Xem" }}
            alt={record.name}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#999",
            }}
          >
            N/A
          </div>
        ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text: string, record) => (
        <div style={{ minWidth: 220 }}>
          <div style={{ fontWeight: 600 }}>{text}</div>
        </div>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "categoryId",
      key: "name",
      render: (text: string, record) => (
        <div style={{ minWidth: 220 }}>

          <Tag
            color="geekblue"
          >{getCategoryName(record.categoryId)}</Tag>
        </div>
      ),
    },
    {
      title: "Giá",
      key: "price",
      width: 160,
      render: (_: any, r: Product) => {
        const base = Number(r.price ?? 0);
        const sale = Number(r.salePrice ?? 0);

        const hasSale = sale > 0 && sale < base;

        if (!hasSale) return <b>{formatCurrency(base)}</b>;

        return (
          <div>
            <div style={{ color: "#ff4d4f", fontWeight: 700 }}>{formatCurrency(sale)}</div>
            <div style={{ color: "#8c8c8c", textDecoration: "line-through", fontSize: 12 }}>
              {formatCurrency(base)}
            </div>
          </div>
        );
      },
    },
    {
      title: "Topping",
      dataIndex: "toppings",
      key: "toppings",
      render: (ids: string[]) => {
        const names = (ids || [])
          .map((id) => toppings.find((t) => t.id === id)?.name)
          .filter(Boolean) as string[];

        if (!names.length) return <span style={{ color: "#999" }}>—</span>;

        return (
          <Space wrap>
            {names.slice(0, 4).map((n) => (
              <Tag
                color="orange"
                key={n}>{n}</Tag>
            ))}
            {names.length > 4 ? <Tag>+{names.length - 4}</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "Đã bán",
      dataIndex: "totalSold",
      key: "totalSold",
      width: 120,
      render: (v: number) => {
        const n = Number(v ?? 0);

        // tuỳ bạn chỉnh ngưỡng màu
        const color =
          n === 0 ? "default" :
            n < 10 ? "blue" :
              n < 100 ? "green" :
                "volcano";

        return <Tag color={color}>{n}</Tag>;
      },
    },
    {
      title: "Đánh giá",
      dataIndex: "averageRating",
      key: "averageRating",
      width: 140,
      render: (v: number) => {
        const r = Number(v ?? 0);
        const text = r.toFixed(1);

        // preset color của Tag có "gold"
        return (
          <Tag color="gold" icon={<StarFilled />}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isAvailable",
      key: "isAvailable",
      width: 170,
      render: (_: any, record) => (
        <Space>
          <Switch
            checked={record.isAvailable}
            onChange={async () => {
              try {
                await toggleProductAvailable(record.id);
                message.success("Đã cập nhật trạng thái");
              } catch (e: any) {
                console.error(e);
                message.error(e?.message || "Không cập nhật được");
              }
            }}
          />
          {record.isAvailable ? <Tag color="green">Còn hàng</Tag> : <Tag color="red">Hết hàng</Tag>}
        </Space>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 320,
      render: (_: any, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Sửa
          </Button>

          <Button
            icon={<PictureOutlined />}
            onClick={() => {
              setImagesProductId(record.id);
              setImagesModalOpen(true);
            }}
          >
            Ảnh
          </Button>
          <Button
            icon={<SlidersOutlined />}
            onClick={() => {
              setOptionsProduct(record);
              setOptionsOpen(true);
            }}
          >
            Tuỳ chọn
          </Button>
          {canDelete ? (
            <Popconfirm
              title="Xoá sản phẩm"
              description="Bạn có chắc muốn xoá sản phẩm này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteProduct(record.id);
                  message.success("Đã xoá sản phẩm");
                } catch (e: any) {
                  message.error(e?.message || "Không xoá được");
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Xoá
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    }
  ];

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Sản phẩm</div>
          <div style={{ color: "#777" }}>Quản lý các món trong thực đơn</div>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <Space wrap style={{ width: "100%" }}>
          <Input
            style={{ width: 260 }}
            placeholder="Tìm kiếm sản phẩm..."
            prefix={<SearchOutlined />}
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Select
            style={{ width: 220 }}
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: "all", label: "Tất cả danh mục" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            style={{ width: 180 }}
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "available", label: "Còn hàng" },
              { value: "unavailable", label: "Hết hàng" },
            ]}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchProducts({ status: "all" }).catch(() => { });
              message.success("Đã tải lại danh sách");
            }}
          >
            Tải lại
          </Button>
        </Space>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as ActiveTab)}
        items={[
          { key: "all", label: tabLabel("Tất cả", tabCounts.all) },
          { key: "active", label: tabLabel("Còn hoạt động", tabCounts.active) },
          { key: "inactive", label: tabLabel("Ngừng hoạt động", tabCounts.inactive) },
        ]}
      />
      {/* Table */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
        <Table<Product> rowKey={(r) => r.id} columns={columns} dataSource={filtered} pagination={{ pageSize: 10 }} />
      </div>

      {/* Modal Create/Edit */}
      <ProductModal
        open={openModal}
        mode={mode}
        initialData={editing}
        categories={categories}
        toppings={toppings}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      {/* Modal quản lý ảnh nâng cao */}
      <ProductImagesModal
        open={imagesModalOpen}
        productId={imagesProductId}
        onClose={() => {
          setImagesModalOpen(false);
          setImagesProductId(null);
        }}
        onChanged={() => {
          fetchProducts({ status: "all" }).catch(() => { });
        }}
      />
      <ProductOptionsModal
        open={optionsOpen}
        product={optionsProduct}
        onClose={() => {
          setOptionsOpen(false);
          setOptionsProduct(null);
        }}
      />
    </div>
  );
}
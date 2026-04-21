/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  ShieldAlert,
  Store,
  Copy,
  Globe,
  Clock,
  Wallet,
  Navigation,
  Info,
} from "lucide-react";

import { API } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { Image as AntImage } from "antd";

const DOC_LABEL: Record<string, string> = {
  business_license_url: "Giấy phép kinh doanh",
  id_card_front_url: "CCCD mặt trước",
  id_card_back_url: "CCCD mặt sau",
  store_front_image_url: "Ảnh mặt tiền",
};

const DOC_ORDER = [
  "business_license_url",
  "id_card_front_url",
  "id_card_back_url",
  "store_front_image_url",
];

const VI_DAY: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const isImageUrl = (url: string) =>
  /\.(png|jpg|jpeg|webp|gif)$/i.test(String(url).split("?")[0]);

function formatDateVi(d?: any) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("vi-VN");
  } catch {
    return "-";
  }
}

function normalizeStatus(raw: any): "pending" | "approved" | "rejected" | "blocked" {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("pending")) return "pending";
  if (s.includes("approved")) return "approved";
  if (s.includes("rejected")) return "rejected";
  return "blocked";
}

function safeText(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

async function copyToClipboard(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã copy ${label}`);
  } catch {
    toast.error("Copy thất bại (browser chặn).");
  }
}

export default function MerchantDetail() {
  const { id } = useParams();
  const loc = useLocation();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    API.get(`/admin/merchants/${id}`)
      .then((res) => setData(res.data?.data))
      .finally(() => setLoading(false));
  }, [id]);

  const status = useMemo(() => normalizeStatus(data?.approval_status), [data?.approval_status]);

  const owner = data?.owner_user_id;

  const displayEmail = data?.email ?? owner?.email ?? "-";
  const displayPhone = data?.phone ?? owner?.phone ?? "-";

  const addressFull = useMemo(() => {
    const parts = [data?.address, data?.district, data?.city].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }, [data?.address, data?.district, data?.city]);

  // GeoJSON: coordinates thường là [lng, lat]
  const coords = data?.location?.coordinates;
  const lng = Array.isArray(coords) ? coords?.[0] : undefined;
  const lat = Array.isArray(coords) ? coords?.[1] : undefined;
  const mapUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

  const docEntries = useMemo(() => {
    const docs = data?.documents ?? {};
    const entries = Object.entries(docs).filter(([, url]) => !!url);

    entries.sort((a, b) => {
      const ai = DOC_ORDER.indexOf(a[0]);
      const bi = DOC_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    return entries;
  }, [data]);

  const imageDocs = useMemo(
    () => docEntries.filter(([, url]) => isImageUrl(String(url))),
    [docEntries]
  );

  const nonImageDocs = useMemo(
    () => docEntries.filter(([, url]) => !isImageUrl(String(url))),
    [docEntries]
  );

  const businessHours = useMemo(() => {
    const arr = Array.isArray(data?.business_hours) ? data.business_hours : [];
    // sort by day asc
    return [...arr].sort((a, b) => (a?.day ?? 0) - (b?.day ?? 0));
  }, [data]);

  const coverUrl = data?.cover_image_url ?? data?.coverImage;
  const logoUrl = data?.logo_url ?? data?.logo;

  if (loading) return <div className="p-6">Đang tải...</div>;
  if (!data) return <div className="p-6">Không tìm thấy merchant</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb + top actions */}
      <div className="flex flex-col gap-3">
        <div className="text-sm text-muted-foreground">
          <Link className="hover:underline" to="/dashboard">
            Dashboard
          </Link>{" "}
          /{" "}
          <Link className="hover:underline" to="/merchants/pending">
            Review Queue
          </Link>{" "}
          / <span className="text-foreground font-medium">Merchant Detail</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/merchants/pending">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="gap-2 py-1.5">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">#{data?._id ?? data?.id ?? id}</span>
            </Badge>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => copyToClipboard("link", window.location.origin + loc.pathname)}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
        </div>
      </div>

      {/* Hero / Profile */}
      <Card className="overflow-hidden">
        <div className="relative h-44 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />

          <div className="absolute right-4 top-4">
            <Badge className="backdrop-blur bg-background/60" variant="secondary">
              <StatusBadge status={status} />
            </Badge>
          </div>

          <div className="absolute left-6 -bottom-10 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-background border shadow-lg overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
              )}
            </div>

            <div className="pb-2">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold tracking-tight">{safeText(data?.name)}</h1>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Category: <span className="text-foreground">{safeText(data?.category)}</span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-14 pb-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="documents">Hồ sơ</TabsTrigger>
              <TabsTrigger value="ops">Vận hành</TabsTrigger>
              <TabsTrigger value="rejection" disabled={!(data?.rejection_reasons?.length || data?.rejection_note)}>
                Từ chối
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: merchant info */}
                <Card className="lg:col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-5 w-5 text-muted-foreground" />
                      <div className="text-lg font-semibold">Thông tin Merchant</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{displayEmail}</span>
                        {displayEmail !== "-" ? (
                          <button
                            className="ml-auto text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard("email", String(displayEmail))}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">SĐT:</span>
                        <span className="font-medium">{displayPhone}</span>
                        {displayPhone !== "-" ? (
                          <button
                            className="ml-auto text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard("số điện thoại", String(displayPhone))}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-start gap-2 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="text-muted-foreground">Địa chỉ:</div>
                          <div className="font-medium">{addressFull}</div>
                          {mapUrl ? (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm underline mt-1"
                            >
                              <Navigation className="h-4 w-4" />
                              Mở Google Maps
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tạo lúc:</span>
                        <span className="font-medium">{formatDateVi(data?.created_at ?? data?.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Cập nhật:</span>
                        <span className="font-medium">{formatDateVi(data?.updated_at ?? data?.updatedAt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Onboarding step:</span>
                        <span className="font-medium">{safeText(data?.onboarding_step)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="font-medium">{formatDateVi(data?.submitted_at)}</span>
                      </div>
                    </div>

                    {data?.description ? (
                      <>
                        <Separator className="my-4" />
                        <div className="text-sm">
                          <div className="text-muted-foreground mb-1">Mô tả:</div>
                          <div className="rounded-xl border bg-muted/20 p-4 leading-relaxed">
                            {data.description}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Right: owner + quick stats */}
                <div className="space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div className="text-lg font-semibold">Chủ sở hữu</div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="text-muted-foreground">
                          Họ tên: <span className="text-foreground font-medium">{safeText(owner?.full_name)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Email: <span className="text-foreground font-medium">{safeText(owner?.email)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          SĐT: <span className="text-foreground font-medium">{safeText(owner?.phone)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          User ID: <span className="text-foreground font-medium">{safeText(owner?._id)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-lg font-semibold mb-3">Thống kê</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border bg-background p-3">
                          <div className="text-muted-foreground">Tổng đơn</div>
                          <div className="text-xl font-bold">{data?.total_orders ?? data?.totalOrders ?? 0}</div>
                        </div>
                        <div className="rounded-xl border bg-background p-3">
                          <div className="text-muted-foreground">Rating</div>
                          <div className="text-xl font-bold">{data?.average_rating ?? data?.rating ?? 0}</div>
                        </div>
                        <div className="rounded-xl border bg-background p-3">
                          <div className="text-muted-foreground">Reviews</div>
                          <div className="text-xl font-bold">{data?.total_reviews ?? 0}</div>
                        </div>
                        <div className="rounded-xl border bg-background p-3">
                          <div className="text-muted-foreground">Active</div>
                          <div className="text-xl font-bold">{data?.is_active ? "Yes" : "No"}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3">
                        * Không có thì sẽ về 0 / No.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* DOCUMENTS */}
            <TabsContent value="documents">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="text-lg font-semibold">Hồ sơ đã nộp</div>
                      <div className="text-sm text-muted-foreground">
                        Nhấn vào ảnh để phóng to (zoom/next/prev).
                      </div>
                    </div>
                    <Badge variant="outline">{docEntries.length} mục</Badge>
                  </div>

                  {docEntries.length === 0 ? (
                    <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                      Merchant chưa upload giấy tờ nào.
                    </div>
                  ) : (
                    <>
                      {imageDocs.length > 0 ? (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            Ảnh (Preview)
                          </div>

                          <AntImage.PreviewGroup>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {imageDocs.map(([key, url]) => {
                                const u = String(url);
                                return (
                                  <div key={key} className="rounded-2xl border bg-background overflow-hidden">
                                    <div className="p-3 border-b flex items-center justify-between gap-2">
                                      <div className="text-sm font-medium truncate">
                                        {DOC_LABEL[key] ?? key}
                                      </div>
                                      <a
                                        href={u}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Mở link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </div>
                                    <div className="p-3">
                                      <AntImage
                                        src={u}
                                        alt={DOC_LABEL[key] ?? key}
                                        style={{
                                          width: "100%",
                                          height: 180,
                                          objectFit: "cover",
                                          borderRadius: 12,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </AntImage.PreviewGroup>
                        </div>
                      ) : null}

                      {nonImageDocs.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            File khác
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {nonImageDocs.map(([key, url]) => {
                              const u = String(url);
                              return (
                                <div key={key} className="rounded-2xl border bg-background p-4 flex items-start gap-3">
                                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="font-semibold truncate">{DOC_LABEL[key] ?? key}</div>
                                      <a href={u} target="_blank" rel="noreferrer" className="text-sm underline whitespace-nowrap">
                                        Mở <ExternalLink className="inline h-4 w-4 ml-1" />
                                      </a>
                                    </div>
                                    <div className="text-xs text-muted-foreground break-all mt-1">{u}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* OPS */}
            <TabsContent value="ops">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="text-lg font-semibold">Vận hành</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-muted-foreground">Đang nhận đơn</div>
                        <div className="text-xl font-bold">{data?.is_accepting_orders ? "Yes" : "No"}</div>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-muted-foreground">Prep time (phút)</div>
                        <div className="text-xl font-bold">{data?.average_prep_time_min ?? 0}</div>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-muted-foreground">Bán kính giao (km)</div>
                        <div className="text-xl font-bold">{data?.delivery_radius_km ?? 0}</div>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-muted-foreground">Approval status</div>
                        <div className="text-xl font-bold">{safeText(data?.approval_status)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <div className="text-lg font-semibold">Tài chính</div>
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground">Commission rate</div>
                        <div className="font-semibold">
                          {data?.commission_rate !== undefined && data?.commission_rate !== null
                            ? `${Number(data.commission_rate) * 100}%`
                            : "-"}
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="text-xs text-muted-foreground">
                        * Commission hiển thị dạng % nếu BE lưu dạng 0.2 = 20%.
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        Location:{" "}
                        <span className="font-medium">
                          {typeof lat === "number" && typeof lng === "number"
                            ? `${lat}, ${lng}`
                            : "-"}
                        </span>
                      </div>
                      {mapUrl ? (
                        <a href={mapUrl} target="_blank" rel="noreferrer" className="ml-auto text-sm underline">
                          Maps <ExternalLink className="inline h-4 w-4 ml-1" />
                        </a>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div className="text-lg font-semibold">Giờ hoạt động</div>
                    </div>

                    {businessHours.length === 0 ? (
                      <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                        Chưa có business_hours
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {businessHours.map((h: any, idx: number) => (
                          <div key={idx} className="rounded-2xl border bg-background p-4">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">Thứ: {VI_DAY[h?.day] ?? h?.day}</div>
                              <Badge variant={h?.is_closed ? "destructive" : "outline"}>
                                {h?.is_closed ? "Đóng" : "Mở"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              Giờ:{" "}
                              <span className="text-foreground font-medium">
                                {h?.is_closed ? "-" : `${safeText(h?.open_time)} - ${safeText(h?.close_time)}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* REJECTION
            <TabsContent value="rejection">
              {(data?.rejection_reasons?.length || data?.rejection_note) ? (
                <Card className="border-destructive/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                      <div className="text-lg font-semibold">Thông tin từ chối</div>
                    </div>

                    {data?.rejection_reasons?.length ? (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">Lý do</div>
                        <div className="flex flex-wrap gap-2">
                          {data.rejection_reasons.map((r: string, i: number) => (
                            <Badge key={i} variant="outline" className="border-destructive/30">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {data?.rejection_note ? (
                      <div>
                        <div className="text-sm font-medium mb-2">Ghi chú</div>
                        <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed">
                          {data.rejection_note}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-sm text-muted-foreground">Không có thông tin từ chối.</div>
              )}
            </TabsContent> */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

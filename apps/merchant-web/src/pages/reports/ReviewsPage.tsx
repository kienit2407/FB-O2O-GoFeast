/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Star, MessageSquare, Send, Filter, Store, Package } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMerchantReviewsStore } from '@/store/merchantReviewsStore';
import type { MerchantReviewFeedItem } from '@/service/merchant-reviews.service';

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function TypeBadge({ type }: { type: 'merchant' | 'product' }) {
  return type === 'product' ? (
    <Badge variant="secondary" className="gap-1">
      <Package className="h-3.5 w-3.5" />
      Sản phẩm
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Store className="h-3.5 w-3.5" />
      Quán
    </Badge>
  );
}

function ReviewStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${star <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'} `}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { toast } = useToast();

  const summary = useMerchantReviewsStore((s) => s.summary);
  const items = useMerchantReviewsStore((s) => s.items);

  const selectedType = useMerchantReviewsStore((s) => s.selectedType);
  const selectedRating = useMerchantReviewsStore((s) => s.selectedRating);

  const loadingSummary = useMerchantReviewsStore((s) => s.loadingSummary);
  const loadingFeed = useMerchantReviewsStore((s) => s.loadingFeed);
  const replying = useMerchantReviewsStore((s) => s.replying);
  const replyTargetId = useMerchantReviewsStore((s) => s.replyTargetId);

  const errorSummary = useMerchantReviewsStore((s) => s.errorSummary);
  const errorFeed = useMerchantReviewsStore((s) => s.errorFeed);

  const hasMore = useMerchantReviewsStore((s) => s.hasMore);

  const setType = useMerchantReviewsStore((s) => s.setType);
  const setRating = useMerchantReviewsStore((s) => s.setRating);
  const bootstrap = useMerchantReviewsStore((s) => s.bootstrap);
  const fetchFeed = useMerchantReviewsStore((s) => s.fetchFeed);
  const loadMore = useMerchantReviewsStore((s) => s.loadMore);
  const refresh = useMerchantReviewsStore((s) => s.refresh);
  const replyReview = useMerchantReviewsStore((s) => s.replyReview);

  const [replyDialog, setReplyDialog] = useState<MerchantReviewFeedItem | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    void fetchFeed();
  }, [selectedType, selectedRating, fetchFeed]);

  const avgRating = Number(summary?.average_rating ?? 0).toFixed(1);
  const totalReviews = Number(summary?.total_reviews ?? 0);

  const ratingCounts = useMemo(() => {
    const total = items.length || 1;
    return [5, 4, 3, 2, 1].map((rating) => {
      const count = items.filter((x) => x.rating === rating).length;
      return {
        rating,
        count,
        percentage: Math.round((count / total) * 100),
      };
    });
  }, [items]);

  const openReplyDialog = (item: MerchantReviewFeedItem) => {
    setReplyDialog(item);
    setReplyText(item.merchant_reply?.content ?? '');
  };

  const handleReply = async () => {
    if (!replyDialog) return;
    const content = replyText.trim();
    if (!content) return;

    const ok = await replyReview(replyDialog.id, content);
    if (!ok) {
      toast({
        title: 'Gửi phản hồi thất bại',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: replyDialog.merchant_reply ? 'Đã cập nhật phản hồi' : 'Đã gửi phản hồi',
    });

    setReplyDialog(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đánh giá & Reviews</h1>
          <p className="text-muted-foreground">
            Xem và phản hồi đánh giá từ khách hàng
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={selectedType}
            onValueChange={(v) => setType(v as 'all' | 'merchant' | 'product')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loại đánh giá" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="merchant">Đánh giá quán</SelectItem>
              <SelectItem value="product">Đánh giá sản phẩm</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedRating}
            onValueChange={(v) => setRating(v as 'all' | '1' | '2' | '3' | '4' | '5')}
          >
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả sao</SelectItem>
              <SelectItem value="5">5 sao</SelectItem>
              <SelectItem value="4">4 sao</SelectItem>
              <SelectItem value="3">3 sao</SelectItem>
              <SelectItem value="2">2 sao</SelectItem>
              <SelectItem value="1">1 sao</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => void refresh()}>
            Làm mới
          </Button>
        </div>
      </div>

      {(errorSummary || errorFeed) && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {errorSummary ?? errorFeed}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mb-2 text-5xl font-bold text-primary">
              {loadingSummary ? '...' : avgRating}
            </div>
            <div className="mb-2 flex items-center justify-center gap-1">
              <ReviewStars rating={Math.round(Number(summary?.average_rating ?? 0))} size={20} />
            </div>
            <p className="text-muted-foreground">{totalReviews} đánh giá</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="font-semibold">{summary?.store_reviews?.total_reviews ?? 0}</div>
                <div className="text-muted-foreground">Đánh giá quán</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-semibold">{summary?.product_reviews?.total_reviews ?? 0}</div>
                <div className="text-muted-foreground">Đánh giá sản phẩm</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Phân bố số sao</CardTitle>
            <CardDescription>Dựa trên danh sách đánh giá đang hiển thị</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingCounts.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex w-16 items-center gap-1">
                    <span className="font-medium">{rating}</span>
                    <Star className="h-4 w-4 text-warning fill-warning" />
                  </div>

                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-12 text-right text-sm text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đánh giá</CardTitle>
          <CardDescription>{items.length} đánh giá</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadingFeed && items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Đang tải danh sách đánh giá...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Chưa có đánh giá nào
            </div>
          ) : (
            items.map((review) => (
              <div key={review.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {review.customer.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(review.created_at)}
                      </span>
                      <TypeBadge type={review.type} />
                    </div>

                    <ReviewStars rating={review.rating} />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReplyDialog(review)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {review.merchant_reply ? 'Sửa phản hồi' : 'Phản hồi'}
                  </Button>
                </div>

                {review.type === 'product' && review.product && (
                  <div className="mb-2 text-sm">
                    <span className="font-medium">Sản phẩm:</span>{' '}
                    <span className="text-muted-foreground">{review.product.name}</span>
                  </div>
                )}

                {review.merchant && (
                  <div className="mb-3 text-sm">
                    <span className="font-medium">Quán:</span>{' '}
                    <span className="text-muted-foreground">{review.merchant.name}</span>
                  </div>
                )}

                <p className="mb-3 text-sm text-muted-foreground">
                  {review.comment || 'Khách hàng không để lại nội dung'}
                </p>

                {review.images.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {review.images.map((img, index) => (
                      <img
                        key={`${review.id}_${index}`}
                        src={img.url}
                        alt="review"
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    ))}
                  </div>
                )}

                {review.video_url && (
                  <div className="mb-3 text-sm text-muted-foreground">
                    Có đính kèm video
                  </div>
                )}

                {review.merchant_reply && (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary">Phản hồi từ quán</Badge>
                      {review.merchant_reply.is_edited && (
                        <span className="text-xs text-muted-foreground">(đã chỉnh sửa)</span>
                      )}
                    </div>
                    <p className="text-sm">{review.merchant_reply.content}</p>
                  </div>
                )}
              </div>
            ))
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                onClick={() => void loadMore()}
                disabled={loadingFeed}
              >
                {loadingFeed ? 'Đang tải...' : 'Xem thêm'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!replyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReplyDialog(null);
            setReplyText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {replyDialog?.merchant_reply ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {replyDialog && (
              <div className="rounded-lg bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <ReviewStars rating={replyDialog.rating} />
                  <TypeBadge type={replyDialog.type} />
                </div>

                {replyDialog.type === 'product' && replyDialog.product && (
                  <div className="mb-2 text-sm font-medium">
                    {replyDialog.product.name}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {replyDialog.comment || 'Khách hàng không để lại nội dung'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="Nhập phản hồi của bạn..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyDialog(null);
                setReplyText('');
              }}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleReply}
              disabled={!replyText.trim() || (replying && replyTargetId === replyDialog?.id)}
            >
              <Send className="mr-2 h-4 w-4" />
              {replying && replyTargetId === replyDialog?.id
                ? 'Đang gửi...'
                : replyDialog?.merchant_reply
                  ? 'Cập nhật phản hồi'
                  : 'Gửi phản hồi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
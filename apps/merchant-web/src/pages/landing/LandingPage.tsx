import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChefHat,
  Truck,
  ShoppingBag,
  ArrowRight,
  Star,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Statistic, StatisticProps } from 'antd';
import CountUp from 'react-countup'
const features = [
  { icon: <ShoppingBag className="w-8 h-8" />, title: 'Quản lý đơn hàng dễ dàng', description: 'Theo dõi delivery & dine-in tập trung' },
  { icon: <ChefHat className="w-8 h-8" />, title: 'Quản lý menu linh hoạt', description: 'Thêm món, danh mục, topping nhanh chóng' },
  { icon: <Truck className="w-8 h-8" />, title: 'Tích hợp giao hàng', description: 'Kết nối đội tài xế, theo dõi real-time' },
  { icon: <BarChart3 className="w-8 h-8" />, title: 'Báo cáo chi tiết', description: 'Doanh thu, best-seller, thống kê...' },
];

const benefits = [
  { icon: <Clock className="w-5 h-5" />, text: 'Đăng ký nhanh chóng' },
  { icon: <MapPin className="w-5 h-5" />, text: 'Hỗ trợ định vị chính xác' },
  { icon: <TrendingUp className="w-5 h-5" />, text: 'Tăng doanh thu hiệu quả' },
  { icon: <Users className="w-5 h-5" />, text: 'Tiếp cận nhiều khách hàng' },
];

const stats = [
  { value: 10000, label: 'Nhà hàng đối tác', suffix: '+' },
  { value: 500000, label: 'Đơn hàng/tháng', suffix: '+' },
  { value: 50000, label: 'Tài xế', suffix: '+' },
  { value: 2000000, label: 'Khách hàng', suffix: '+' },
];

export default function LandingPage() {
  const formatter: StatisticProps['formatter'] = (value) => (
    <CountUp end={value as number} separator="," />
  );
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <LandingHeader />

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Nền tảng Food Delivery hàng đầu Việt Nam
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Phát triển kinh doanh <span className="text-orange-500">dễ dàng</span> cùng Go Feast
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Kết nối với khách hàng, quản lý đơn hàng và tăng doanh thu với nền tảng quản trị đối tác.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/merchant/register">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8">
                  Trở thành đối tác ngay
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    <Statistic
                      value={stat.value}
                      formatter={formatter}
                      suffix={stat.suffix} // Thêm dấu + vào sau số nếu cần
                    />
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-500">
                  {b.icon}
                </div>
                <span className="text-gray-700 font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tại sao chọn Go Feast?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Giải pháp toàn diện giúp bạn phát triển kinh doanh</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-orange-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sẵn sàng để phát triển kinh doanh?</h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">Tham gia cùng hàng nghìn đối tác</p>
          <Link to="/merchant/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Đăng ký miễn phí
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <img src="/icon_app.png" alt="FaB-O2O Logo" className="w-10 h-10" />
              <span className="text-lg font-bold text-white">Go Feast</span>
            </div>
            <p className="text-sm">© 2026 Go Feast. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

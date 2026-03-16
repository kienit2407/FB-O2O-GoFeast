import mongoose from 'mongoose';
import { MerchantSchema, Merchant } from 'src/modules/merchants/schemas/merchant.schema';
import { ProductSchema, Product } from 'src/modules/merchants/schemas/product.schema';
import { normalizeSearchText } from 'src/modules/search/utils/search-normalizer.util';

async function run() {
    await mongoose.connect(process.env.MONGO_URI!);

    const MerchantModel = mongoose.model(Merchant.name, MerchantSchema);
    const ProductModel = mongoose.model(Product.name, ProductSchema);

    const merchants = await MerchantModel.find({});
    for (const m of merchants) {
        m.set('name_search', normalizeSearchText(m.get('name')));
        await m.save({ validateBeforeSave: false }); // 👉 Thêm option này
    }

    const products = await ProductModel.find({});
    for (const p of products) {
    p.set('name_search', normalizeSearchText(p.get('name')));
    await p.save({ validateBeforeSave: false }); // 👉 Thêm option này
  }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
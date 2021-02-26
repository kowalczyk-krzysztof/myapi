import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  deleteProduct,
  updateProduct,
} from '../controllers/product';

const productRouter = express.Router();

productRouter.route('/').get(getProducts).post(createProduct);

productRouter
  .route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

export default productRouter;

import data from "../middleware/cloudinary.js";
import getDataUri from "../middleware/dataUri.js";
import orderShema from "../model/data/orderShema.js";
import productModel from "../model/data/productModel.js";
import usersShema from "../model/data/usersShema.js";
import HttpError from "../model/DummyData/http-error.js";
import { funsiCari } from "./contollerProduct.js";

const datetime = new Date();

const options = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
};

export const getAllOrder = async (req, res, next) => {
  try {
    const allDataOrder = await orderShema
      .find()
      .populate("userId produks.produk");
    if (allDataOrder.length === 0)
      throw new HttpError("Tidak ada data Order", 401);

    res.status(201).json({
      allDataOrder,
    });
  } catch (err) {
    next(err);
  }
};

export const postOrder = async (req, res, next) => {
  try {
    const product = await productModel.find();
    let saveOrder = true;
    const dataUser = await funsiCari(req.userData.id, usersShema);
    const userKeranjang = await usersShema.findById(req.userData.id);
    if (dataUser.length === 0) throw new HttpError("Tidak ada Data", 201);
    product.filter(async (data) => {
      try {
        const hasil = data._id;
        const datakeranjanguser = dataUser[0].keranjangOrder.item.filter(
          async (datasss) => {
            try {
              if (datasss.produkIds.toString() === hasil.toString()) {
                const sisastock = data.stock - datasss.quantity;
                data.stock = sisastock;
                if (data.stock < 0) {
                  saveOrder = false;
                }
                if (saveOrder) {
                  saveOrder = true;
                }
              }
            } catch (err) {
              next(err);
            }
          }
        );
        if (saveOrder) {
          await data.save();
        }
        return datakeranjanguser;
      } catch (err) {
        next(err);
      }
    });
    const gambarCloudUri = getDataUri(req.file);

    const uploadImageCloud = await data.uploader.upload(
      gambarCloudUri.content,
      { folder: "gambar" }
    );

    const populatedata = await dataUser[0].populate(
      "keranjangOrder.item.produkIds"
    );
    const dataProductOder = await populatedata.keranjangOrder.item.map(
      (data) => {
        console.log({ ...data.produkIds._doc }, `kocak`, {
          ...data.produkIds,
        });
        return {
          ukuran: data.ukuran,
          noteProduk: data.noteProduk,
          quantity: data.quantity,
          produk: { ...data.produkIds._doc },
        };
      }
    );
    const totalHarga = dataProductOder
      ?.map((data) => data.quantity * data.produk.harga)
      .reduce((a, b) => a + b, 20000);

    const order = await new orderShema({
      produks: dataProductOder,
      userId: req.userData.id,
      totalHarga: totalHarga,
      tanggal: new Intl.DateTimeFormat("id", options).format(datetime),
      buktiTranfer: {
        publick_id: uploadImageCloud.public_id,
        url: uploadImageCloud.secure_url,
      },
    });
    if (!saveOrder) throw new HttpError("Stock Habis", 201);

    userKeranjang.keranjangOrder.item = [];
    userKeranjang.keranjangOrder.waktuBatasPembayaran = null;

    if (saveOrder) {
      await order.save();
      await userKeranjang.save();
      await res.status(201).json({
        order,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const detailTransaksi = async (req, res, next) => {
  try {
    const paramsOrderId = req.params.idorder;

    const orderData = await orderShema.find().populate("userId produks.produk");
    const orderid = await orderData.filter(
      (data) => data._id.toString() === paramsOrderId
    );
    if (orderid.length === 0) throw new HttpError("Tidak ada Data", 401);
    await res.status(201).json({
      orderid,
    });
  } catch (err) {
    next(err);
  }
};

export const inputResi = async (req, res, next) => {
  try {
    const pid = req.params.pid;
    const { resi } = req.body;
    console.log(resi);
    const dataIdOrder = await orderShema.findById(pid);
    if (!req.file || !resi) throw new HttpError("Belum memasukan data", 401);
    const gambarResicloud = getDataUri(req.file);

    const uploadImageCloud = await data.uploader.upload(
      gambarResicloud.content,
      { folder: "gambar" }
    );

    dataIdOrder.resiPengiriman = resi;
    dataIdOrder.gambarResi = {
      publick_id: uploadImageCloud.public_id,
      url: uploadImageCloud.secure_url,
    };

    dataIdOrder.save();

    await res.status(201).json({
      dataIdOrder,
    });
  } catch (err) {
    next(err);
  }
};

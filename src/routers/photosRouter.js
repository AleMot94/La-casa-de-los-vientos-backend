import express from "express";
import { getPhotos } from "../controllers/photosController.js";

const PHOTOS_ROUTER = express.Router();

PHOTOS_ROUTER.get("/", getPhotos);

export default PHOTOS_ROUTER

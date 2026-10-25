import Photo from "./models/Photo.js";


class PhotoDAO {

    async getAll() {
        return await Photo.find({}, { _id: 0 }).lean();
    }

    // Crea la foto o, si ya existe ese id, reemplaza sus datos (el script de fotos se puede correr de nuevo)
    async upsert(photo) {
        return await Photo.findOneAndUpdate({ id: photo.id }, photo, {
            upsert: true,
            returnDocument: "after",
            runValidators: true,
        });
    }
}

export const PHOTO_DAO = new PhotoDAO()

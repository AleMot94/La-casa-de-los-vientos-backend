import Contact from "./models/Contact.js";


class ContactDAO {

    async create(data) {
        return await Contact.create(data);
    }

    async setStatus(id, status) {
        return await Contact.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
    }

    // Cuántas consultas hizo este email desde la fecha dada (sin importar si el mail salió o no)
    async countByEmailSince(email, since) {
        return await Contact.countDocuments({ email, createdAt: { $gte: since } });
    }
}

export const CONTACT_DAO = new ContactDAO()

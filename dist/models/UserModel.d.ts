import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    googleId?: string;
    name?: string;
    email: string;
}
declare const UserModel: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & Required<{
    _id: unknown;
}>, any>;
export default UserModel;

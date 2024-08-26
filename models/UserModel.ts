import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  googleId?: string;
  name?: string;
  email: string;
}

const UserSchema: Schema<IUser> = new Schema({
  googleId: String,
  name: String,
  email: { type: String, required: true },
});

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;

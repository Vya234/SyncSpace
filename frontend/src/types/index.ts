export type User = {
  id: string;
  name: string;
  email: string;
};

export type Workspace = {
  _id: string;
  title: string;
  createdBy: string;
  members: string[];
  noteContent?: string;
  createdAt?: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

export type ActiveUser = {
  userId: string;
  name: string;
};


export type ArtifactDocument = {
  challengeId?: string;
  category?: string;
  pageCount?: number;
  id: string;
  objectId: string;
  title: string;
  style: "handwriting" | "typed" | "sticky";
  body: string;
  page?: number;
  drawer?: number;
  folder?: number;
};
export type DocumentMetadata = Omit<ArtifactDocument, "body" | "objectId">;
export type ArtifactPick = {
  documentId?: string;
  drawer?: number;
  folder?: number;
  turn?: number;
  sequence: number;
};

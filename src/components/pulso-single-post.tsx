"use client";
import { useState } from "react";
import { PostCard, type PulsoFeedPost } from "@/app/solos/pulso/feed/feed-client";
export default function SinglePost({ post, canInteract }: { post: PulsoFeedPost; canInteract: boolean }) {
  const [message, setMessage] = useState("");
  return <><PostCard post={post} canInteract={canInteract} readOnly={!canInteract} allowRepost={false} onMessage={setMessage} />{message ? <p className="panel" role="status">{message}</p> : null}</>;
}

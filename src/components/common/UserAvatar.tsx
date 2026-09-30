import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";

interface UserAvatarProps {
  userId?: string;
  name?: string;
  photoURL?: string | null;
  className?: string;
}

export function UserAvatar({ 
  userId, 
  name = "User", 
  photoURL: initialPhotoURL, 
  className = "h-10 w-10 text-sm" 
}: UserAvatarProps) {
  const [fetchedPhoto, setFetchedPhoto] = useState<string | null>(null);
  const [fetchedName, setFetchedName] = useState<string | null>(null);

  useEffect(() => {
    // If we already have a photo, or no userId, no need to fetch
    if (initialPhotoURL || !userId) return;
    
    const fetchPhoto = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.photoURL) setFetchedPhoto(data.photoURL);
          if (data.name) setFetchedName(data.name);
        }
      } catch (err) {
        console.error("Error fetching user photo:", err);
      }
    };
    
    fetchPhoto();
  }, [userId, initialPhotoURL]);

  const displayPhoto = initialPhotoURL || fetchedPhoto;
  
  // Extract up to 2 initials
  const getInitials = (n: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase();
  };
  
  const displayName = fetchedName || name;
  const initials = getInitials(displayName);

  return (
    <div className={`shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 ${className}`}>
      {displayPhoto ? (
        <img src={displayPhoto} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

export async function fetchTrips(userId) {
  const q = query(
    collection(db, "users", userId, "trips"),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveTrip(userId, trip) {
  console.log("saveTrip called", userId, trip.id);
  try {
    const ref = doc(db, "users", userId, "trips", trip.id);
    await setDoc(ref, trip);
    console.log("saveTrip success");
  } catch (e) {
    console.error("saveTrip error", e);
  }
}

export async function deleteTrip(userId, tripId) {
  const ref = doc(db, "users", userId, "trips", tripId);
  await deleteDoc(ref);
}

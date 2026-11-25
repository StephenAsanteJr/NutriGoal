import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";
import { C } from "@/lib/theme";
import { Button } from "@/components/UI";

const LABELS = ["", "Not helpful", "Somewhat helpful", "Helpful", "Very helpful", "Exactly what I needed"];

/** Member rates the plan they received (1–5 stars + optional comment). Ratings feed the clinician's dashboard. */
export function RateCard({ clinician, rating, onRate }: { clinician: string; rating: number | null; onRate: (rating: number, comment: string) => Promise<void> }) {
  const [stars, setStars] = useState(rating ?? 0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <View style={{ backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginVertical: 8 }}>
      <Text style={{ color: C.navy, fontWeight: "800" }}>{rating ? "Your rating" : `How useful was ${clinician}'s plan?`}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n]}`} accessibilityState={{ selected: stars === n }}>
            <Ionicons name={n <= stars ? "star" : "star-outline"} size={30} color={n <= stars ? C.green : C.line} />
          </Pressable>
        ))}
        <Text style={{ color: C.slate, fontSize: 12, marginLeft: 6 }}>{stars ? LABELS[stars] : "Tap a star"}</Text>
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Anything to add? (optional)"
        placeholderTextColor={C.muted}
        maxLength={300}
        style={{ marginTop: 10, backgroundColor: C.mist, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.navy }}
      />
      <Button
        label={done ? "Thanks for rating" : rating ? "Update rating" : "Send rating"}
        kind="dark"
        busy={busy}
        disabled={!stars}
        onPress={async () => {
          setBusy(true);
          try {
            await onRate(stars, comment);
            setDone(true);
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

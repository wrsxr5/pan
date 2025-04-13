import { registerActionHandler } from "@pan/types";

declare var self: Worker;

registerActionHandler(self, async () => {
  const isVerified = await Bun.password.verify("password", "");
  if (!isVerified) {
    throw new Error("an error occurred");
  }
});

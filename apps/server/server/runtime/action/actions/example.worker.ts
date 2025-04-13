import { registerActionHandler } from "@pan/types";
import { getLogger } from "../../../util/logger";

declare var self: Worker;

registerActionHandler(self, (context) => {
  const logger = getLogger("example", "INFO");
  logger.info("selected:", context.selectedEntries);
});

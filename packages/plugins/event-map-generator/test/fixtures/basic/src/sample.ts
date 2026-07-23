import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";

declare const applicationEventPublisher: {
  publish(event: { name: string; data?: unknown }): void;
};

export class SampleFeature {
  @OnEvent("sample:created")
  handleCreated() {}
}

applicationEventPublisher.publish({
  name: "sample:published",
  data: { id: 1, enabled: true },
});

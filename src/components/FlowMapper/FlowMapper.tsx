"use client";

import { FlowMapperProvider } from "./FlowMapperContext";
import { Form } from "./Form";

export default function FlowMapper() {
  return (
    <FlowMapperProvider>
      <Form />
      {/* Flow diagram UI will go here */}
    </FlowMapperProvider>
  );
}

"use client";

import { CrawlerProvider, useCrawler } from "@/store/useCrawler";
import { Form } from "./Form";
import Visualize from "./Visualize";

function FlowResultView() {
  const { crawlResult, isCrawling } = useCrawler();

  return (
    <div className="w-full h-full">
      {isCrawling || crawlResult ? <Visualize /> : <Form />}
    </div>
  );
}

export default function FlowMapper() {
  return (
    <CrawlerProvider>
      <FlowResultView />
    </CrawlerProvider>
  );
}

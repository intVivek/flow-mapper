"use client";

import { CrawlerProvider, useCrawler } from "@/store/useCrawler";
import { Form } from "./Form";

function FlowResultView() {
  const { crawlResult } = useCrawler();

  console.log(crawlResult);
  return (
    <div className="w-full h-full">
      {crawlResult ? <div>Flow diagram UI will go here</div> : <Form />}
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

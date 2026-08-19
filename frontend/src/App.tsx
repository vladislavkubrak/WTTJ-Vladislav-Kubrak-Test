import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { IconSprite } from "./components/IconSprite";
import { JobList } from "./pages/JobList";

import "./index.css";

/*
 * Only the job list is bundled with the entry.
 *
 * It is the landing route, and giving it a loading state to reach its own code
 * would be a self-inflicted waterfall. Everything else is split out: the forms
 * pull in react-hook-form, which nobody browsing jobs needs. Every page is a
 * named export, hence the interop mapping.
 */
const JobDetail = lazy(() =>
  import("./pages/JobDetail").then((m) => ({ default: m.JobDetail })),
);
const CreateJob = lazy(() =>
  import("./pages/CreateJob").then((m) => ({ default: m.CreateJob })),
);
const SignIn = lazy(() =>
  import("./pages/SignIn").then((m) => ({ default: m.SignIn })),
);
const SignUp = lazy(() =>
  import("./pages/SignUp").then((m) => ({ default: m.SignUp })),
);
const SignOut = lazy(() =>
  import("./pages/SignOut").then((m) => ({ default: m.SignOut })),
);
const Apply = lazy(() =>
  import("./pages/Apply").then((m) => ({ default: m.Apply })),
);

export const App = () => {
  return (
    <BrowserRouter>
      {/* Defines the `<symbol>`s that welcome-ui's Icon points its `<use>`
          at. Without it every icon in the app renders at 0x0. */}
      <IconSprite />

      {/* No fallback markup: these chunks are a few kB on a local network, and
          a spinner that flashes for one frame is worse than nothing. */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />

          <Route path="/" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:jobId/apply" element={<Apply />} />
          <Route path="/jobs/new" element={<CreateJob />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

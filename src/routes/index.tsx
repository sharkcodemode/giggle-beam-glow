import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 space-y-8">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-lg">
        <img
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/f10efe35-b8f6-4da8-b3f0-d3f5775c6287?Expires=1779774013&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=S%2BpCtnUCM6U7wc3CLvXdrHaGzToW7wkZUjBEXHQdOTLQJIIjJjAoptEjvCbiy8EqVO9B11tYkLZWUP3mqyzJDC%2BbhL1Y4A1RNY8O4pW22P1aDzOqbsw%2FGO9NK1%2FwUeVk4jb4CC1S0yqmFgT3xiHYZx5Lm0voPksqjSUjQ0kfO9F1PLGXYHx2mWBdzHfTU3u1caZahrDvD%2BT4Y4ZwoROHMoJ6ld1yza2fmmXt7gNx6s4F47z0%2BRejBiSKbDPiSUTb%2FPPpfv%2Bl8tCOYnmBTE0hyF%2F36%2BsAkTJ0FA569qfAWs%2B%2Fb%2FDgkw2hXS6%2B3OrmbR7d%2FawKnbLiCDasusdAIYdGRQ%3D%3D"
          alt="Banner de anúncio"
          className="h-auto w-full object-cover"
        />
      </div>
      
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-center">Ouça o áudio</h2>
        <audio 
          controls 
          className="w-full"
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ddedf186-4c7d-42e5-93aa-8a37f2b0d97e?Expires=1779777066&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GGMjoj4BmFN45r9wq0jpNS%2B%2FUzSUff1K04R1PGUEVFkgPmKbitS9485gaK6wjEeujS6FqmsXl1SntElSOdbAVWEWseCt7XRSfo6dciRU8CSMBCu2tVwl6XuUqqQ8xYo43foTNtLHJo7I7NX5tYbTeGkrzFD9TIDDc3NnnQLaURp4dg4bwIh463tWrmYhSdCpYnP2q5oKQ3%2FlSDy3h2uvuihqiQlzSnAPTDmYU%2Bn5a4LXwP74x9D6kYYkmvecon%2FHYCYFjxldyDUZAO6UIU8%2Fv3kU23PbKhYC3ftA%2BeqvKvFBzId6DQGwlHPTv%2FvHNLpq9L5WDgGQgdvh6fxgBPChUg%3D%3D"
        >
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
    </div>
  );
}

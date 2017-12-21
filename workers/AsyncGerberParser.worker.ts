const ctx: Worker = self as any;

ctx.addEventListener("message", (e:MessageEvent) => {
    let data = e.data;
    console.log(`Working on ${JSON.stringify(data)}`);
    ctx.postMessage({b:2});
});

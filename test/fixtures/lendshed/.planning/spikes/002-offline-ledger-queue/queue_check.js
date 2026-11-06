const queue = [];
for (const id of [1, 2, 3]) queue.push({ loan: id });
console.log(queue.map((entry) => entry.loan).join(','));

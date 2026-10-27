async function test() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "Admin@12345" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login status:", loginRes.status);

  const reviewsRes = await fetch("http://localhost:3000/api/reviews", {
    headers: { Cookie: cookie || "" },
  });
  const json = await reviewsRes.json();
  console.log("Reviews API status:", reviewsRes.status, "Success:", json.success, "Count:", json.data?.reviews?.length);
  console.log("Stats:", json.data?.stats);
  if (json.data?.reviews) {
    json.data.reviews.forEach((r, i) => {
      console.log(`[${i + 1}] Order: '${r.orderId}' | Cust: '${r.customerName}' | Status: '${r.status}' | Prod: '${r.productId?.name}'`);
    });
  } else {
    console.log("Error:", json);
  }
}
test().catch(console.error);

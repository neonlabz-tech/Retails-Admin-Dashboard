async function testPost() {
  const body = {
    productId: "6ad5f67e0e445000414fa0c9",
    productSlug: "portable-desktop-fan-ultra-thin",
    productName: "Portable Desktop Fan (Ultra-Thin Folding Stand)",
    author: "Debug Customer",
    email: "debug@example.com",
    rating: 5,
    title: "Testing Submission",
    comment: "Does this get saved to MongoDB and show in admin?",
  };

  try {
    const res = await fetch("http://localhost:3001/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testPost();

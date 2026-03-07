export async function onRequestPost(context) {

  const formData = await context.request.formData()

  const response = await fetch(context.env.ANALYZER_URL, {
    method: "POST",
    body: formData,
    headers: {
      "Authorization": "Bearer " + context.env.API_KEY
    }
  })

  return new Response(await response.text(), {
    headers: { "Content-Type": "application/json" }
  })

}
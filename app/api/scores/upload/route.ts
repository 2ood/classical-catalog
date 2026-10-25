import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { scoreUploadOptions } from "@/lib/blob";
import { isSessionValid, SESSION_COOKIE } from "@/lib/session";

// Issues client-upload tokens so PDFs go straight from the browser to Blob,
// avoiding the ~4.5MB request body limit on Vercel functions. The score
// record is saved afterwards by POST /api/scores.
export async function POST(request: NextRequest) {
  if (!(await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      request,
      body: (await request.json()) as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^scores\/.+\.pdf$/i.test(pathname)) {
          throw new Error("Scores must be PDFs under scores/");
        }
        return scoreUploadOptions;
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

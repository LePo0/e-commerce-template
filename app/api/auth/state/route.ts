import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const authenticated = Boolean(data?.claims);

    return NextResponse.json(
        { authenticated },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        },
    );
}

// coinsage/src/app/api/people/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromToken } from '@/lib/auth';
import People from '@/model/People';
export async function POST(req: NextRequest) {
  try {
    let token = req.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      token = req.cookies.get('accessToken')?.value; 
    }

    const userId = getUserFromToken(token || '');

    const { name, email, phone, image } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await dbConnect();
    const person = await People.create({ 
      name: name.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      image: image?.trim(),
      user: userId ,
      isUser:false
    });

    return NextResponse.json(person, { status: 201 });
  } catch (err: any) {
    // If token is absent or invalid, `getUserFromToken` throws and we return 401
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Attempt to extract JWT from the Authorization header ("Bearer <token>")
    let token = req.headers.get('authorization')?.split(' ')[1]; 

    // 2. If no header‑based token, fall back to the HTTP‑only cookie "accessToken"
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }

    // 3. Verify the token and extract the user ID (throws if invalid or missing)
    const userId = getUserFromToken(token || '');

    // 4. Ensure database connectivity before querying
    await dbConnect(); 

    // 5. Fetch all "People" documents belonging to this user
    const people = await People.find({ user: userId });
    // 6. Return the array of people as JSON
    return NextResponse.json(people);
  } catch (err: any) {
    // 7. If token verification or any error occurs, return 401 Unauthorized with error message
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
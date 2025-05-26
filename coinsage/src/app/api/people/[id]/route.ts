// coinsage/src/app/api/people/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import People from '@/model/People';        // fixed path: was '@/model/People' :contentReference[oaicite:1]{index=1}
import { getUserFromToken } from '@/lib/auth';

/**
 * GET /api/people/:id
 * Retrieves a single person by ID, but only if it belongs to the authenticated user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Extract JWT from Authorization header first
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      // 2. If no header-based token, fall back to cookie "accessToken"
      token = req.cookies.get('accessToken')?.value;
    } 

    // 3. Verify the token and extract the user ID (throws if invalid/missing)
    const userId = getUserFromToken(token || '');

    // 4. Ensure DB is connected
    await dbConnect();

    // 5. Find a person whose _id matches params.id AND whose user field matches userId
    const person = await People.findOne({
      _id: params.id,
      user: userId,
    });

    if (!person) {
      // 6. If no document matches both id AND user, return 404
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // 7. Return the found document
    return NextResponse.json(person);
  } catch (err: any) {
    // 8. If token verification or DB error occurs, return 400
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

/**
 * PUT /api/people/:id
 * Updates a single person’s fields only if it belongs to the authenticated user.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Extract token from header or cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    } 

    // 2. Verify token to get userId (throws if invalid)
    const userId = getUserFromToken(token || '');

    // 3. Parse request body for update fields
    const { name, email, phone, image } = await req.json();

    // 4. Connect to DB
    await dbConnect();

    // 5. findOneAndUpdate with both _id and user filters
    const person = await People.findOneAndUpdate(
      { _id: params.id, user: userId },
      { name, email, phone, image },
      { new: true }  // return the updated document
    );

    if (!person) {
      // 6. If no matching doc, respond 404
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // 7. Return updated document
    return NextResponse.json(person);
  } catch (err: any) {
    // 8. On error (token or otherwise), return 400
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

/**
 * DELETE /api/people/:id
 * Deletes a single person document only if it belongs to the authenticated user.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Extract token from header or cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }

    // 2. Verify token to get userId
    const userId = getUserFromToken(token || '');

    // 3. Connect to DB
    await dbConnect();

    // 4. findOneAndDelete using both _id and user filters
    const person = await People.findOneAndDelete({
      _id: params.id,
      user: userId,
    });

    if (!person) {
      // 5. If no matching doc exists, return 404
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // 6. Return success message
    return NextResponse.json({ message: 'Person deleted successfully' });
  } catch (err: any) {
    // 7. On error, return 400
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

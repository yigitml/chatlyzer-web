import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import { ContactPostRequest, ContactPutRequest } from "@/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const contact = await prisma.contact.findFirst({
        where: { id, userId: authenticatedUserId },
      });
      if (contact) {
        return ApiResponse.success(contact).toResponse();
      }
      return ApiResponse.error("Contact not found", 404).toResponse();
    } else {
      const contacts = await prisma.contact.findMany({
        where: { userId: authenticatedUserId },
        orderBy: { createdAt: "desc" },
      });
      return ApiResponse.success(contacts).toResponse();
    }
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: ContactPostRequest = await request.json();
    
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId: authenticatedUserId,
        identifier: data.identifier,
        source: data.source,
      }
    });

    if (existingContact) {
      return ApiResponse.error("Contact already exists", 400).toResponse();
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        identifier: data.identifier,
        source: data.source,
        userId: authenticatedUserId,
      }
    });
    
    return ApiResponse.success(contact, "Contact created successfully", 200).toResponse();
  } catch (error) {
    console.error("Error creating contact:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: ContactPutRequest = await request.json();
    const { id, name, identifier, source } = data;
    
    if (!id) {
      return ApiResponse.error("Contact ID is required", 400).toResponse();
    }

    const updatedContact = await prisma.contact.update({
      where: { id, userId: authenticatedUserId },
      data: {
        name,
        identifier,
        source,
      }
    });

    if (updatedContact) {
      return ApiResponse.success(updatedContact, "Contact updated successfully", 200).toResponse();
    }

    return ApiResponse.error("Contact not found", 404).toResponse();
  } catch (error) {
    console.error("Error updating contact:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { id } = await request.json();

    if (!id) {
      return ApiResponse.error("Contact ID is required", 400).toResponse();
    }

    const deletedContact = await prisma.contact.update({
      where: { id, userId: authenticatedUserId },
      data: {
        deletedAt: new Date(),
      },
    });

    if (deletedContact) {
      return ApiResponse.success(deletedContact, "Contact deleted successfully", 200).toResponse();
    }

    return ApiResponse.error("Contact not found", 404).toResponse();
  } catch (error) {
    console.error("Error deleting contact:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

import { create } from "zustand";
import { Contact } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { ContactGetRequest, ContactPostRequest, ContactPutRequest, ContactDeleteRequest } from "@/types/api/apiRequest";

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  error: Error | null;
}

interface ContactActions {
  setSelectedContact: (contact: Contact) => Promise<void>;
  fetchContacts: (params?: ContactGetRequest) => Promise<Contact[]>;
  fetchContact: (id: string) => Promise<Contact | null>;
  createContact: (data: ContactPostRequest) => Promise<Contact>;
  updateContact: (data: ContactPutRequest) => Promise<Contact>;
  deleteContact: (data: ContactDeleteRequest) => Promise<boolean>;
}

export type ContactStore = ContactState & ContactActions;

export const useContactStore = create<ContactStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    contacts: [],
    selectedContact: null,
    isLoading: false,
    error: null,

    setSelectedContact: async (contact: Contact) => {
      set({ selectedContact: contact });
    },

    fetchContacts: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const contacts = await networkService.fetchContacts(params);
        set({ contacts, isLoading: false });
        return contacts;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchContact: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const contacts = await networkService.fetchContacts({ id });
        const contact = contacts.length > 0 ? contacts[0] : null;
        set({ isLoading: false });
        return contact;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createContact: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const contact = await networkService.createContact(data);
        set((state) => ({ 
          contacts: [...state.contacts, contact],
          isLoading: false 
        }));
        return contact;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateContact: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const updatedContact = await networkService.updateContact(data);
        set((state) => ({
          contacts: state.contacts.map(contact => contact.id === data.id ? updatedContact : contact),
          isLoading: false
        }));
        return updatedContact;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteContact: async (data) => {
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteContact(data);
        set((state) => ({
          contacts: state.contacts.filter(contact => contact.id !== data.id),
          isLoading: false
        }));
        return true;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    }
  };
});
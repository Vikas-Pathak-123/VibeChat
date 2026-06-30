import { ViewIcon, EditIcon, EmailIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent,
  ModalBody, ModalCloseButton, Button, useDisclosure,
  IconButton, Text, Image, Box, Divider, useToast,
  Input, VStack, HStack, Tooltip,
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import axios from "axios";
import { User } from "../../types";
import { useChatState } from "../../context/ChatProvider";
import { API_BASE_URL } from "../../constants/api.constants";

interface ProfileModalProps {
  user: User;
  children?: React.ReactNode;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: loggedUser, setUser } = useChatState();

  // Only allow editing if viewing own profile
  const isOwnProfile = loggedUser?._id === user._id;

  const [isEditing, setIsEditing]       = useState<boolean>(false);
  const [displayName, setDisplayName]   = useState<string>(user.name);
  const [picLoading, setPicLoading]     = useState<boolean>(false);
  const [saveLoading, setSaveLoading]   = useState<boolean>(false);
  const [previewPic, setPreviewPic]     = useState<string>(user.picture);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const toast                           = useToast();

  const handlePicUpload = (file: File | undefined): void => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: "Only JPEG/PNG allowed", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    setPicLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VibeChat");
    formData.append("cloud_name", "difmt49ax");
    fetch("https://api.cloudinary.com/v1_1/difmt49ax/image/upload", { method: "post", body: formData })
      .then((r) => r.json())
      .then((data) => {
        setPreviewPic(data.url);
        toast({ title: "Photo ready ✅", description: "Click Save to apply changes", status: "success", duration: 3000, isClosable: true, position: "top" });
      })
      .catch(() => toast({ title: "Upload failed", status: "error", duration: 4000, isClosable: true, position: "top" }))
      .finally(() => setPicLoading(false));
  };

  const handleSave = async (): Promise<void> => {
    if (!displayName.trim()) {
      toast({ title: "Name cannot be empty", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      setSaveLoading(true);
      const { data } = await axios.put(
        `${API_BASE_URL}/api/user/profile`,
        { name: displayName.trim(), picture: previewPic },
        { headers: { Authorization: `Bearer ${loggedUser?.token}` } }
      );
      // Update context + localStorage so navbar reflects changes immediately
      const updated = { ...loggedUser, ...data };
      setUser(updated);
      localStorage.setItem("userInfo", JSON.stringify(updated));
      toast({ title: "Profile updated! 🎉", status: "success", duration: 3000, isClosable: true, position: "top" });
      setIsEditing(false);
    } catch {
      toast({ title: "Failed to update profile", status: "error", duration: 4000, isClosable: true, position: "top" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClose = (): void => {
    // Reset unsaved edits on close
    setDisplayName(user.name);
    setPreviewPic(user.picture);
    setIsEditing(false);
    onClose();
  };

  return (
    <>
      {/* Trigger */}
      {children
        ? <span onClick={onOpen}>{children}</span>
        : (
          <Tooltip label="View Profile" hasArrow placement="bottom">
            <IconButton
              aria-label="View profile"
              icon={<ViewIcon />}
              onClick={onOpen}
              variant="nav"
              size="sm"
            />
          </Tooltip>
        )
      }

      <Modal size="sm" onClose={handleClose} isOpen={isOpen} isCentered>
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent
          bg="bg-surface"
          border="1px solid"
          borderColor="border-subtle"
          borderRadius="16px"
          overflow="hidden"
          mx={4}
        >
          {/* ── Gradient Header Banner ─────────────────────────────── */}
          <Box
            h="80px"
            bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)"
          />

          <ModalCloseButton color="white" top={3} right={3} onClick={handleClose} />

          <ModalBody pb={6} pt={0}>
            <VStack spacing={4} align="center">

              {/* ── Avatar ──────────────────────────────────────────── */}
              <Box position="relative" mt="-40px">
                <Image
                  borderRadius="full"
                  boxSize="80px"
                  src={previewPic}
                  alt={user.name}
                  border="3px solid"
                  borderColor="bg-surface"
                  objectFit="cover"
                  bg="bg-elevated"
                  fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=E1306C&color=fff`}
                />
                {/* Edit avatar button — own profile only */}
                {isOwnProfile && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handlePicUpload(e.target.files?.[0])}
                    />
                    <Tooltip label="Change photo" hasArrow>
                      <IconButton
                        aria-label="Change photo"
                        icon={<EditIcon />}
                        size="xs"
                        borderRadius="full"
                        position="absolute"
                        bottom="0"
                        right="0"
                        bg="accent"
                        color="white"
                        _hover={{ bg: "accent-hover" }}
                        isLoading={picLoading}
                        onClick={() => fileInputRef.current?.click()}
                      />
                    </Tooltip>
                  </>
                )}
              </Box>

              {/* ── Name ────────────────────────────────────────────── */}
              {isEditing ? (
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  textAlign="center"
                  fontWeight="bold"
                  fontSize="lg"
                  color="text-primary"
                  bg="bg-input"
                  border="1px solid"
                  borderColor="accent"
                  borderRadius="8px"
                  _focus={{ boxShadow: "0 0 0 1px #E1306C" }}
                  maxLength={30}
                />
              ) : (
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color="text-primary"
                  textAlign="center"
                >
                  {user.name}
                </Text>
              )}

              {/* ── Email ───────────────────────────────────────────── */}
              <HStack color="text-secondary" fontSize="sm" spacing={2}>
                <EmailIcon />
                <Text>{user.email}</Text>
              </HStack>

              <Divider borderColor="border-subtle" />

              {/* ── Action Buttons ──────────────────────────────────── */}
              {isOwnProfile && (
                isEditing ? (
                  <HStack w="100%" spacing={3}>
                    <Button
                      flex={1}
                      variant="nav"
                      border="1px solid"
                      borderColor="border-subtle"
                      color="text-primary"
                      onClick={() => {
                        setDisplayName(user.name);
                        setPreviewPic(user.picture);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      flex={1}
                      variant="primary"
                      isLoading={saveLoading}
                      loadingText="Saving..."
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </HStack>
                ) : (
                  <Button
                    w="100%"
                    variant="nav"
                    border="1px solid"
                    borderColor="border-subtle"
                    leftIcon={<EditIcon />}
                    color="text-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )
              )}

            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;


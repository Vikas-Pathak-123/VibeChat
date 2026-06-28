import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, IconButton, Text, Image,
} from "@chakra-ui/react";
import { User } from "../../types";

interface ProfileModalProps {
  user: User;
  children?: React.ReactNode;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      {children
        ? <span onClick={onOpen}>{children}</span>
        : <IconButton aria-label="View profile" icon={<ViewIcon />} onClick={onOpen} variant="nav" size="sm" />
      }
      <Modal size="lg" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="bg-surface" border="1px solid" borderColor="border-subtle" borderRadius="12px">
          <ModalHeader textAlign="center" color="text-primary" fontSize="2xl" fontWeight="bold">
            {user.name}
          </ModalHeader>
          <ModalCloseButton color="text-secondary" />
          <ModalBody display="flex" flexDir="column" alignItems="center" gap={4} pb={6}>
            <Image
              borderRadius="full" boxSize="140px"
              src={user.picture} alt={user.name}
              border="3px solid" borderColor="accent"
            />
            <Text color="text-secondary" fontSize="sm">
              <b>Email: </b>{user.email}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="nav" onClick={onClose} color="text-primary" border="1px solid" borderColor="border-subtle">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
